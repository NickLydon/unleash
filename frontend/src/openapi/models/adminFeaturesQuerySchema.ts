/**
 * Generated by orval v6.11.0 🍺
 * Do not edit manually.
 * Unleash API
 * OpenAPI spec version: 4.21.0-beta.1
 */

export interface AdminFeaturesQuerySchema {
    /** Used to filter by tags. For each entry, a TAGTYPE:TAGVALUE is expected */
    tag?: string[];
    /** A case-insensitive prefix filter for the names of feature toggles */
    namePrefix?: string;
}
