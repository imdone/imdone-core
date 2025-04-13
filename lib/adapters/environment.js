export function isDev() {
  return /dev/i.test(process.env.NODE_ENV)
}