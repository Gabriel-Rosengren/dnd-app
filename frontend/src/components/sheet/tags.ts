/** Comma separated list of strings (languages, proficiencies…). */
export function tagsToString(tags: string[]) {
  return tags.join(", ");
}
export function stringToTags(s: string) {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
