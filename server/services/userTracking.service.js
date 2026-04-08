const TRACKING_LIMIT = 12;

const normalizeIds = (ids = []) => ids.map((id) => String(id));

const prependUniqueWithLimit = (existing = [], id, limit = TRACKING_LIMIT) => {
  const itemId = String(id);
  const filtered = normalizeIds(existing).filter(
    (currentId) => currentId !== itemId,
  );
  return [itemId, ...filtered].slice(0, limit);
};

const appendUniqueWithLimit = (
  existing = [],
  ids = [],
  limit = TRACKING_LIMIT,
) => {
  const output = normalizeIds(existing);

  for (const id of ids) {
    const currentId = String(id);
    if (!output.includes(currentId)) {
      output.push(currentId);
    }
  }

  return output.slice(-limit);
};

module.exports = {
  TRACKING_LIMIT,
  prependUniqueWithLimit,
  appendUniqueWithLimit,
};
