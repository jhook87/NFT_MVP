import express from "express";
import multer from "multer";
import { verifyAll } from "../../verifier/src/verify-lib";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.get("/healthz", (_, res) => res.send("ok"));

app.post("/verify", upload.single("file"), async (req, res) => {
  try {
    const { rpc, contract, token } = req.body as any;
    if (!req.file || !rpc || !contract || !token) {
      return res.status(400).json({ ok: false, reason: "Missing file, rpc, contract or token" });
    }
    const result = await verifyAll({
      contentBytes: req.file.buffer,
      rpc,
      contractAddr: contract,
      tokenId: BigInt(token),
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ ok: false, reason: e.message || String(e) });
  }
});

app.listen(8787, () => console.log("Verifier API on :8787"));