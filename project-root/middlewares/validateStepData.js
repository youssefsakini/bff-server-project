export default function validateStepData(req, res, next) {
  const { stepNumber } = req.params;
  const stepData = req.body;

  const step = Number.parseInt(stepNumber);
  if (isNaN(step) || step < 1 || step > 4) {
    return res
      .status(400)
      .json({ error: "Invalid step number. Must be between 1 and 4." });
  }

  const validationErrors = [];
  switch (step) {
    case 1:
      if (!stepData.firstName || stepData.firstName.length < 2) {
        validationErrors.push("First name must be at least 2 characters");
      }
      if (!stepData.lastName || stepData.lastName.length < 2) {
        validationErrors.push("Last name must be at least 2 characters");
      }
      if (!stepData.dateOfBirth)
        validationErrors.push("Date of birth required");
      if (!stepData.gender) validationErrors.push("Gender required");
      break;

    case 2:
      if (!stepData.email || !/\S+@\S+\.\S+/.test(stepData.email)) {
        validationErrors.push("Valid email required");
      }
      if (!stepData.phone || !/^\+?[\d\s-()]+$/.test(stepData.phone)) {
        validationErrors.push("Valid phone number required");
      }
      if (!stepData.address) validationErrors.push("Address required");
      if (!stepData.city) validationErrors.push("City required");
      if (!stepData.country) validationErrors.push("Country required");
      break;

    case 3:
      if (!stepData.theme) validationErrors.push("Theme preference required");
      if (!stepData.language)
        validationErrors.push("Language preference required");
      break;

    case 4:
      if (!stepData.terms) validationErrors.push("Must agree to terms");
      if (!stepData.privacy)
        validationErrors.push("Must agree to privacy policy");
      break;
  }

  if (validationErrors.length > 0) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: validationErrors });
  }

  next();
}
