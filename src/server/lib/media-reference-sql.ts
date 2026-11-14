/** SQL identifiers below come only from fixed application expressions, never input. */
function authority(value: string) {
  const afterScheme = `substr(${value}, instr(${value}, '://') + 3)`;
  return `lower(substr(${afterScheme}, 1, instr(${afterScheme}, '/') - 1))`;
}

/**
 * SQLite cannot implement the URL parser. Unknown aliases therefore preserve
 * objects / reject writes. Only a literal, unambiguous external authority from
 * the existing image allowlist can exempt query or encoded path characters.
 * In particular, userinfo, ports and encoded hostnames never get this exemption.
 * WHATWG URL parsing strips the entire leading/trailing C0+space range, and
 * removes tab/LF/CR internally. Preserve all U+0000–U+0020, wherever they occur.
 * NUL uses a BLOB search because SQLite text GLOB/length stop at the first NUL.
 * https://url.spec.whatwg.org/#concept-basic-url-parser
 * https://www.sqlite.org/nulinstr.html
 */
export function ambiguousMediaReferenceSql(value: string, media = "media_objects") {
  return `(
    (${value} GLOB '*[?#%]*' OR ${value} LIKE '%/../%' OR
      ${value} LIKE '%/./%' OR instr(${value}, char(92)) > 0 OR
      instr(CAST(${value} AS BLOB), x'00') > 0 OR
      ${value} GLOB ('*[' || char(1) || '-' || char(32) || ']*'))
    AND NOT EXISTS (
      SELECT 1 FROM (SELECT ${authority(value)} AS external_host,
        ${authority(`${media}.url`)} AS managed_authority)
      WHERE substr(${value}, 1, 8) = 'https://'
        AND external_host != '' AND external_host NOT GLOB '*[^a-z0-9.-]*'
        AND external_host != substr(managed_authority, 1, instr(managed_authority || ':', ':') - 1)
        AND (external_host IN ('gomate.cos.jiahongw.com', 'cdn.discordapp.com', 'images.unsplash.com')
          OR external_host LIKE '%.githubusercontent.com'
          OR external_host LIKE '%.googleusercontent.com')
    )
  )`;
}

export function exactMediaReferenceSql(value: string, media = "media_objects") {
  return `(${value} = ${media}.key OR ${value} = ${media}.url OR
    substr(${value}, -length(${media}.key)-1) = '/' || ${media}.key)`;
}

export function mediaReferenceSql(value: string, media = "media_objects") {
  return `(${exactMediaReferenceSql(value, media)} OR ${ambiguousMediaReferenceSql(value, media)})`;
}
