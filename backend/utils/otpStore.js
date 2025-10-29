const store = new Map();
function setOtp(email, otp, ttlSeconds=300){
  store.set(email, { otp, expiresAt: Date.now()+ttlSeconds*1000 });
}
function verifyOtp(email, otp){
  const rec = store.get(email);
  if(!rec) return false;
  if(Date.now() > rec.expiresAt) { store.delete(email); return false; }
  if(rec.otp.toString() === otp.toString()){ store.delete(email); return true; }
  return false;
}
module.exports = { setOtp, verifyOtp };
