require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { supabase } = require("./lib/supabase");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "gbp-seo-saas-backend" });
});

app.get("/test-db", async (_req, res, next) => {
  try {
    const { data, error } = await supabase().from("tenants").select("*");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, count: data?.length ?? 0, tenants: data });
  } catch (err) {
    next(err);
  }
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
