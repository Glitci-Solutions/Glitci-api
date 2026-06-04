import crypto from "crypto";
import { AttendanceConfig } from "./attendanceConfig.model.js";
import { QRToken } from "./qrToken.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";

export async function generateQRToken() {
  const config = await AttendanceConfig.getConfig();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + config.qrLifetimeSeconds * 1000;
  const payload = `${issuedAt}.${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", config.qrSigningSecret)
    .update(payload)
    .digest("hex");
  const token = Buffer.from(JSON.stringify({ issuedAt, expiresAt, signature }))
    .toString("base64url");
  return { token, expiresAt };
}

export async function validateQRToken(token, employeeId) {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    throw new ApiError("Invalid QR token format", 400);
  }

  const { issuedAt, expiresAt, signature } = parsed;

  if (Date.now() > expiresAt) throw new ApiError("QR token has expired", 400);

  const config = await AttendanceConfig.getConfig();
  const expectedSig = crypto
    .createHmac("sha256", config.qrSigningSecret)
    .update(`${issuedAt}.${expiresAt}`)
    .digest("hex");
  if (signature !== expectedSig) throw new ApiError("QR token signature invalid", 400);

  const alreadyUsed = await QRToken.findOne({ token });
  if (alreadyUsed) throw new ApiError("QR token has already been used", 400);

  await QRToken.create({ token, usedBy: employeeId });

  return { valid: true };
}