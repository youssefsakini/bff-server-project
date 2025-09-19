import { v4 as uuidv4 } from "uuid";
import { pool } from "../config/database.js";

export async function createSession() {
  const sessionId = uuidv4();
  const query = `
    INSERT INTO bff_sessions (id, created_at, last_updated)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const values = [sessionId, new Date(), new Date()];

  try {
    const result = await pool.query(query, values);
    return sessionId;
  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
}

export async function getSession(sessionId) {
  const sessionQuery = "SELECT * FROM bff_sessions WHERE id = $1";
  const stepsQuery =
    "SELECT * FROM bff_steps WHERE session_id = $1 ORDER BY step_number";

  try {
    const sessionResult = await pool.query(sessionQuery, [sessionId]);
    if (sessionResult.rows.length === 0) return null;

    const session = sessionResult.rows[0];
    const stepsResult = await pool.query(stepsQuery, [sessionId]);

    // Reconstruct the steps object in the expected format
    session.steps = {};
    stepsResult.rows.forEach((step) => {
      session.steps[step.step_number] = {
        data: step.step_data,
        completedAt: step.completed_at,
      };
    });

    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    throw error;
  }
}

export async function updateSessionStep(sessionId, stepNumber, stepData) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update or insert the step
    const stepQuery = `
      INSERT INTO bff_steps (session_id, step_number, step_data, completed_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (session_id, step_number) 
      DO UPDATE SET step_data = $3, completed_at = $4
      RETURNING *
    `;

    const stepValues = [sessionId, parseInt(stepNumber), stepData, new Date()];
    await client.query(stepQuery, stepValues);

    // Update session last_updated
    const sessionQuery = `
      UPDATE bff_sessions 
      SET last_updated = $1
      WHERE id = $2
      RETURNING *
    `;

    await client.query(sessionQuery, [new Date(), sessionId]);

    await client.query("COMMIT");

    // Return the updated session
    return await getSession(sessionId);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating session step:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteSession(sessionId) {
  const query = "DELETE FROM bff_sessions WHERE id = $1";

  try {
    const result = await pool.query(query, [sessionId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
}

export async function getAllSessions() {
  const query = `
    SELECT s.*, COUNT(st.id) as completed_steps_count
    FROM bff_sessions s
    LEFT JOIN bff_steps st ON s.id = st.session_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
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
  const query = `
    INSERT INTO bff_submissions (session_id, submitted_data, final_server_response, success)
    VALUES ($1, $2, $3, $4)
  `;

  const values = [sessionId, submittedData, finalServerResponse, success];

  try {
    await pool.query(query, values);
  } catch (error) {
    console.error("Error archiving session:", error);
    throw error;
  }
}

export async function getStepData(sessionId, stepNumber) {
  const query = `
    SELECT * FROM bff_steps 
    WHERE session_id = $1 AND step_number = $2
  `;

  try {
    const result = await pool.query(query, [sessionId, parseInt(stepNumber)]);
    if (result.rows.length === 0) return null;

    return {
      data: result.rows[0].step_data,
      completedAt: result.rows[0].completed_at,
    };
  } catch (error) {
    console.error("Error getting step data:", error);
    throw error;
  }
}

export async function hasStep(sessionId, stepNumber) {
  const query = `
    SELECT COUNT(*) as count FROM bff_steps 
    WHERE session_id = $1 AND step_number = $2
  `;

  try {
    const result = await pool.query(query, [sessionId, parseInt(stepNumber)]);
    return result.rows[0].count > 0;
  } catch (error) {
    console.error("Error checking step:", error);
    throw error;
  }
}

export async function markSessionAsSubmitted(sessionId) {
  const query = `
    UPDATE bff_sessions 
    SET status = 'submitted', last_updated = $1
    WHERE id = $2
  `;

  try {
    await pool.query(query, [new Date(), sessionId]);
  } catch (error) {
    console.error("Error marking session as submitted:", error);
    throw error;
  }
}
