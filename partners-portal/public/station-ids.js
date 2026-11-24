// Accept historical station identifiers without changing sample or extraction IDs.
export function canonicalStationId(value) {
 return typeof value === 'string' ? value.replace(/^GLOBE-(\d{3})$/, 'GLOBO-$1') : value;
}
