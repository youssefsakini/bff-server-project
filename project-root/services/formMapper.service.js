import { pool } from "./../config/database.js";
export async function mapFormData(session) {
  // Get all steps for this session
  const stepsQuery =
    "SELECT * FROM bff_steps WHERE session_id = $1 ORDER BY step_number";
  const result = await pool.query(stepsQuery, [session.id]);

  // Reconstruct the steps object
  const steps = {};
  result.rows.forEach((row) => {
    steps[row.step_number] = {
      data: row.step_data,
      completedAt: row.completed_at,
    };
  });

  const personalInfo = steps[1]?.data || {};
  const contactInfo = steps[2]?.data || {};
  const preferences = steps[3]?.data || {};
  const review = steps[4]?.data || {};

  return {
    sessionId: session.id,
    submittedAt: new Date().toISOString(),
    user: {
      profile: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        fullName: `${personalInfo.firstName} ${personalInfo.lastName}`,
        dateOfBirth: personalInfo.dateOfBirth,
        gender: personalInfo.gender,
      },
      contact: {
        email: contactInfo.email,
        phone: contactInfo.phone,
        address: {
          street: contactInfo.address,
          city: contactInfo.city,
          country: contactInfo.country,
        },
      },
      preferences: {
        communication: {
          newsletter: preferences.newsletter || false,
          notifications: preferences.notifications || false,
        },
        ui: {
          theme: preferences.theme || "light",
          language: preferences.language || "en",
        },
        interests: preferences.interests || [],
      },
    },
    consent: {
      terms: review.terms || false,
      privacy: review.privacy || false,
      consentDate: new Date().toISOString(),
    },
    processing: {
      completedSteps: result.rows.length,
      totalSteps: 4,
      sessionDuration: new Date() - new Date(session.created_at),
      lastUpdated: session.last_updated,
    },
  };
}
