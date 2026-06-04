const EARTH_RADIUS_METERS = 6371000;

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(a));
}

export function validateLocation(lat, lng, config) {
  const distance = haversineDistance(
    lat,
    lng,
    config.companyLocation.lat,
    config.companyLocation.lng
  );
  return {
    withinRange: distance <= config.allowedRadius,
    distance: Math.round(distance),
  };
}