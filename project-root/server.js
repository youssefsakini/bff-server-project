import app from "./app.js";
import { PORT } from "./config/config.js";

app.listen(PORT, () => {
  console.log(`🚀 BFF Server running on http://localhost:${PORT}`);
});
