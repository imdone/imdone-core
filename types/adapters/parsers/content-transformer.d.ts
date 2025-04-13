/**
 * Interpolates the content with the provided data.
 * @param {string} content - The content to interpolate.
 * @param {object} data - The data to use for interpolation.
 * @param {object} opts - The options for interpolation.
 * @returns {object} - The interpolated content, whether there was interpolation, and error tokens.
 */
export function interpolate(content: string, data: object, opts?: object): object;
export function encodeMarkdownLinks(content: any): any;
export function format(content: any, data: any, mustache: any): any;
