export const BUILDER_CODE = "bc_prv2f8tm";
export const BUILDER_MAGIC = "80218021802180218021802180218021";
export const BUILDER_DATA_SUFFIX = encodeBuilderDataSuffix(BUILDER_CODE);

export function encodeBuilderDataSuffix(code: string): `0x${string}` {
  const bytes = new TextEncoder().encode(code.trim());
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const len = bytes.length.toString(16).padStart(2, "0");
  return `0x${hex}${len}00${BUILDER_MAGIC}`;
}
