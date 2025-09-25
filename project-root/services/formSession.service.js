// Using Redis for session management instead of PostgreSQL
import { v4 as uuidv4 } from "uuid";
import redisClient from "../config/redis.js";

// Redis key patterns
const SESSION_KEY = (sessionId) => `session:${sessionId}`;
const STEP_KEY = (sessionId, stepNumber) =>
  `session:${sessionId}:step:${stepNumber}`;
const SESSIONS_SET = "sessions:all";
const SUBMISSIONS_KEY = "submissions:all";

export async function createSession() {
  const sessionId = uuidv4();
  const sessionKey = SESSION_KEY(sessionId);
  const now = new Date().toISOString();

  const sessionData = {
    id: sessionId,
    created_at: now,
    last_updated: now,
    status: "in_progress",
  };

  try {
    // Store session data
    await redisClient.hSet(sessionKey, sessionData);

    // Add to sessions set for easy retrieval
    await redisClient.sAdd(SESSIONS_SET, sessionId);

    return sessionId;
  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
}

export async function getSession(sessionId) {
  const sessionKey = SESSION_KEY(sessionId);

  try {
    // Check if session exists
    const exists = await redisClient.exists(sessionKey);
    if (!exists) return null;

    // Get session data
    const sessionData = await redisClient.hGetAll(sessionKey);

    // Get all steps for this session
    const stepKeys = await redisClient.keys(`session:${sessionId}:step:*`);
    sessionData.steps = {};

    for (const stepKey of stepKeys) {
      const stepNumber = stepKey.split(":")[3]; // Extract step number from key
      const stepData = await redisClient.hGetAll(stepKey);

      if (stepData && stepData.data) {
        sessionData.steps[stepNumber] = {
          data: JSON.parse(stepData.data),
          completedAt: stepData.completed_at,
        };
      }
    }

    return sessionData;
  } catch (error) {
    console.error("Error getting session:", error);
    throw error;
  }
}

export async function deleteSession(sessionId) {
  const sessionKey = SESSION_KEY(sessionId);

  try {
    // Get all related keys
    const stepKeys = await redisClient.keys(`session:${sessionId}:step:*`);

    // Delete session and all its steps
    const keysToDelete = [sessionKey, ...stepKeys];
    if (keysToDelete.length > 0) {
      await redisClient.del(keysToDelete);
    }

    // Remove from sessions set
    await redisClient.sRem(SESSIONS_SET, sessionId);

    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
}

export async function getAllSessions() {
  try {
    const sessionIds = await redisClient.sMembers(SESSIONS_SET);
    const sessions = [];

    for (const sessionId of sessionIds) {
      const sessionKey = SESSION_KEY(sessionId);
      const sessionData = await redisClient.hGetAll(sessionKey);

      if (sessionData && sessionData.id) {
        // Count completed steps
        const stepKeys = await redisClient.keys(`session:${sessionId}:step:*`);

        sessions.push({
          ...sessionData,
          completed_steps_count: stepKeys.length,
        });
      }
    }

    return sessions.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  } catch (error) {
    console.error("Error getting all sessions:", error);
    throw error;
  }
}

export async function archiveSession(
  sessionId,
  submittedData,
  finalServerResponse,
  success = true
) {
  const submissionKey = `submission:${sessionId}:${Date.now()}`;
  const submissionData = {
    session_id: sessionId,
    submitted_data: JSON.stringify(submittedData),
    final_server_response: JSON.stringify(finalServerResponse),
    success: success.toString(),
    submitted_at: new Date().toISOString(),
  };

  try {
    await redisClient.hSet(submissionKey, submissionData);
    await redisClient.sAdd(SUBMISSIONS_KEY, submissionKey);
  } catch (error) {
    console.error("Error archiving session:", error);
    throw error;
  }
}

export async function getStepData(sessionId, stepNumber) {
  const stepKey = STEP_KEY(sessionId, stepNumber);

  try {
    const stepData = await redisClient.hGetAll(stepKey);
    if (!stepData || !stepData.data) return null;

    return {
      data: JSON.parse(stepData.data),
      completedAt: stepData.completed_at,
    };
  } catch (error) {
    console.error("Error getting step data:", error);
    throw error;
  }
}

export async function hasStep(sessionId, stepNumber) {
  const stepKey = STEP_KEY(sessionId, stepNumber);

  try {
    const exists = await redisClient.exists(stepKey);
    return exists === 1;
  } catch (error) {
    console.error("Error checking step:", error);
    throw error;
  }
}

export async function markSessionAsSubmitted(sessionId) {
  const sessionKey = SESSION_KEY(sessionId);

  try {
    await redisClient.hSet(sessionKey, {
      status: "submitted",
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error marking session as submitted:", error);
    throw error;
  }
}

export async function canPatchStep(sessionId, stepNumber) {
  try {
    // Get all step keys for this session
    const stepKeys = await redisClient.keys(`session:${sessionId}:step:*`);
    const completedSteps = stepKeys
      .map((key) => {
        const parts = key.split(":");
        return parseInt(parts[3]);
      })
      .filter((step) => !isNaN(step));

    const maxCompletedStep =
      completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
    return stepNumber <= maxCompletedStep + 1;
  } catch (error) {
    console.error("Error checking patch eligibility:", error);
    throw error;
  }
}

export async function updateSessionStep(
  sessionId,
  stepNumber,
  stepData,
  isPatch = false
) {
  const sessionKey = SESSION_KEY(sessionId);
  const stepKey = STEP_KEY(sessionId, stepNumber);

  try {
    if (isPatch) {
      // Merge with existing data for PATCH
      const existingStepData = await getStepData(sessionId, stepNumber);
      let mergedData = stepData;

      if (existingStepData && existingStepData.data) {
        mergedData = {
          ...existingStepData.data,
          ...stepData,
        };
      }

      await redisClient.hSet(stepKey, {
        data: JSON.stringify(mergedData),
        completed_at: new Date().toISOString(),
      });
    } else {
      // New step data for POST
      await redisClient.hSet(stepKey, {
        data: JSON.stringify(stepData),
        completed_at: new Date().toISOString(),
      });
    }

    // Update session last_updated
    await redisClient.hSet(sessionKey, {
      last_updated: new Date().toISOString(),
    });

    // Return the updated session
    return await getSession(sessionId);
  } catch (error) {
    console.error("Error updating session step:", error);
    throw error;
  }
}

// import { v4 as uuidv4 } from "uuid";
// import { pool } from "../config/database.js";

// export async function createSession() {
//   const sessionId = uuidv4();
//   const query = `
//     INSERT INTO bff_sessions (id, created_at, last_updated)
//     VALUES ($1, $2, $3)
//     RETURNING *
//   `;

//   const values = [sessionId, new Date(), new Date()];

//   try {
//     const result = await pool.query(query, values);
//     return sessionId;
//   } catch (error) {
//     console.error("Error creating session:", error);
//     throw error;
//   }
// }

// export async function getSession(sessionId) {
//   const sessionQuery = "SELECT * FROM bff_sessions WHERE id = $1";
//   const stepsQuery =
//     "SELECT * FROM bff_steps WHERE session_id = $1 ORDER BY step_number";

//   try {
//     const sessionResult = await pool.query(sessionQuery, [sessionId]);
//     if (sessionResult.rows.length === 0) return null;

//     const session = sessionResult.rows[0];
//     const stepsResult = await pool.query(stepsQuery, [sessionId]);

//     // Reconstruct the steps object in the expected format
//     session.steps = {};
//     stepsResult.rows.forEach((step) => {
//       session.steps[step.step_number] = {
//         data: step.step_data,
//         completedAt: step.completed_at,
//       };
//     });

//     return session;
//   } catch (error) {
//     console.error("Error getting session:", error);
//     throw error;
//   }
// }

// export async function deleteSession(sessionId) {
//   const query = "DELETE FROM bff_sessions WHERE id = $1";

//   try {
//     const result = await pool.query(query, [sessionId]);
//     return result.rowCount > 0;
//   } catch (error) {
//     console.error("Error deleting session:", error);
//     throw error;
//   }
// }

// export async function getAllSessions() {
//   const query = `
//     SELECT s.*, COUNT(st.id) as completed_steps_count
//     FROM bff_sessions s
//     LEFT JOIN bff_steps st ON s.id = st.session_id
//     GROUP BY s.id
//     ORDER BY s.created_at DESC
//   `;

//   try {
//     const result = await pool.query(query);
//     return result.rows;
//   } catch (error) {
//     console.error("Error getting all sessions:", error);
//     throw error;
//   }
// }

// export async function archiveSession(
//   sessionId,
//   submittedData,
//   finalServerResponse,
//   success = true
// ) {
//   const query = `
//     INSERT INTO bff_submissions (session_id, submitted_data, final_server_response, success)
//     VALUES ($1, $2, $3, $4)
//   `;

//   const values = [sessionId, submittedData, finalServerResponse, success];

//   try {
//     await pool.query(query, values);
//   } catch (error) {
//     console.error("Error archiving session:", error);
//     throw error;
//   }
// }

// export async function getStepData(sessionId, stepNumber) {
//   const query = `
//     SELECT * FROM bff_steps
//     WHERE session_id = $1 AND step_number = $2
//   `;

//   try {
//     const result = await pool.query(query, [sessionId, parseInt(stepNumber)]);
//     if (result.rows.length === 0) return null;

//     return {
//       data: result.rows[0].step_data,
//       completedAt: result.rows[0].completed_at,
//     };
//   } catch (error) {
//     console.error("Error getting step data:", error);
//     throw error;
//   }
// }

// export async function hasStep(sessionId, stepNumber) {
//   const query = `
//     SELECT COUNT(*) as count FROM bff_steps
//     WHERE session_id = $1 AND step_number = $2
//   `;

//   try {
//     const result = await pool.query(query, [sessionId, parseInt(stepNumber)]);
//     return result.rows[0].count > 0;
//   } catch (error) {
//     console.error("Error checking step:", error);
//     throw error;
//   }
// }

// export async function markSessionAsSubmitted(sessionId) {
//   const query = `
//     UPDATE bff_sessions
//     SET status = 'submitted', last_updated = $1
//     WHERE id = $2
//   `;

//   try {
//     await pool.query(query, [new Date(), sessionId]);
//   } catch (error) {
//     console.error("Error marking session as submitted:", error);
//     throw error;
//   }
// }
// // Add this function to check if a step can be patched
// export async function canPatchStep(sessionId, stepNumber) {
//   try {
//     // Get all completed steps
//     const stepsQuery = `
//       SELECT step_number FROM bff_steps
//       WHERE session_id = $1
//       ORDER BY step_number
//     `;

//     const result = await pool.query(stepsQuery, [sessionId]);
//     const completedSteps = result.rows.map((row) => row.step_number);

//     // Can patch current step or next logical step
//     const maxCompletedStep =
//       completedSteps.length > 0 ? Math.max(...completedSteps) : 0;

//     return stepNumber <= maxCompletedStep + 1;
//   } catch (error) {
//     console.error("Error checking patch eligibility:", error);
//     throw error;
//   }
// }

// // Update the updateSessionStep function to handle patching
// export async function updateSessionStep(
//   sessionId,
//   stepNumber,
//   stepData,
//   isPatch = false
// ) {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     if (isPatch) {
//       // For patching, we need to merge existing data with new data
//       const existingStepQuery = `
//         SELECT step_data FROM bff_steps
//         WHERE session_id = $1 AND step_number = $2
//       `;

//       const existingResult = await client.query(existingStepQuery, [
//         sessionId,
//         stepNumber,
//       ]);

//       let mergedData = stepData;
//       if (existingResult.rows.length > 0) {
//         // Merge existing data with new data (new data overwrites existing)
//         mergedData = {
//           ...existingResult.rows[0].step_data,
//           ...stepData,
//         };
//       }

//       const stepQuery = `
//         INSERT INTO bff_steps (session_id, step_number, step_data, completed_at)
//         VALUES ($1, $2, $3, $4)
//         ON CONFLICT (session_id, step_number)
//         DO UPDATE SET step_data = $3, completed_at = $4
//         RETURNING *
//       `;

//       const stepValues = [sessionId, stepNumber, mergedData, new Date()];
//       await client.query(stepQuery, stepValues);
//     } else {
//       // Original logic for new step submissions
//       const stepQuery = `
//         INSERT INTO bff_steps (session_id, step_number, step_data, completed_at)
//         VALUES ($1, $2, $3, $4)
//         ON CONFLICT (session_id, step_number)
//         DO UPDATE SET step_data = $3, completed_at = $4
//         RETURNING *
//       `;

//       const stepValues = [sessionId, stepNumber, stepData, new Date()];
//       await client.query(stepQuery, stepValues);
//     }

//     // Update session last_updated
//     const sessionQuery = `
//       UPDATE bff_sessions
//       SET last_updated = $1
//       WHERE id = $2
//       RETURNING *
//     `;

//     await client.query(sessionQuery, [new Date(), sessionId]);
//     await client.query("COMMIT");

//     // Return the updated session
//     return await getSession(sessionId);
//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Error updating session step:", error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }
