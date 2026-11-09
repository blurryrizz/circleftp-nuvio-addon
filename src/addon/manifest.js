export function createManifest(config) {
  return {
    id: config.addonId,
    version: config.addonVersion,
    name: config.addonName,
    description: "Discover movies and series available through CircleFTP on a BDIX-connected network.",
    resources: ["catalog", "meta", "stream"],
    types: ["movie", "series"],
    idPrefixes: ["circleftp:"],
    catalogs: [
      {
        type: "movie",
        id: "circleftp_search",
        name: "CircleFTP",
        extra: [{ name: "search", isRequired: true }]
      },
      {
        type: "series",
        id: "circleftp_search",
        name: "CircleFTP",
        extra: [{ name: "search", isRequired: true }]
      }
    ]
  };
}
