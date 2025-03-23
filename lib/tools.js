import _isFunction from 'lodash.isfunction'
import _noop from 'lodash.noop'
import crypto from 'crypto'
import _path from 'path'
import { sort } from 'fast-sort'
import eol from 'eol'
import escapeRegExp from 'escape-string-regexp'

const max_bytes = 512

function isBinaryCheck(bytes, size) {
  if (size === 0) return false

  var suspicious_bytes = 0
  var total_bytes = Math.min(size, max_bytes)

  if (size >= 3 && bytes[0] == 0xef && bytes[1] == 0xbb && bytes[2] == 0xbf) {
    // UTF-8 BOM. This isn't binary.
    return false
  }

  for (var i = 0; i < total_bytes; i++) {
    if (bytes[i] === 0) {
      // NULL byte--it's binary!
      return true
    } else if (
      (bytes[i] < 7 || bytes[i] > 14) &&
      (bytes[i] < 32 || bytes[i] > 127)
    ) {
      // UTF-8 detection
      if (bytes[i] > 191 && bytes[i] < 224 && i + 1 < total_bytes) {
        i++
        if (bytes[i] < 192) {
          continue
        }
      } else if (bytes[i] > 223 && bytes[i] < 239 && i + 2 < total_bytes) {
        i++
        if (bytes[i] < 192 && bytes[i + 1] < 192) {
          i++
          continue
        }
      }
      suspicious_bytes++
      // Read at least 32 bytes before making a decision
      if (i > 32 && (suspicious_bytes * 100) / total_bytes > 10) {
        return true
      }
    }
  }

  if ((suspicious_bytes * 100) / total_bytes > 10) {
    return true
  }

  return false
}

function deepEqual(a, b) {
  if (a === b) return true; // Same reference

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false; // Different types or one is null
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false; // One is array, one is object

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false; // Different number of keys

  return keysA.every((key) => keysB.includes(key) && deepEqual(a[key], b[key]));
}

export default {
  union(...arrays) {
    return [...new Set(arrays.flat())];
  },
  escapeRegExp(str) {
    return escapeRegExp(str)
  },
  userHome() {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
  },
  deepEqual,
  /**
   * Description
   * @method user
   * @return LogicalExpression
   */
  user() {
    return process.env.USER || process.env.USERNAME
  },

  /**
   * Description
   * @method cb
   * @param {} cb
   * @return ConditionalExpression
   */
  cb(cb) {
    return _isFunction(cb) ? cb : _noop
  },

  inMixinsNoop(cb) {
    cb = this.cb(cb)
    if (cb) return cb(new Error('Implemented in mixins'))
    throw new Error('Implemented in mixins')
  },

  /**
   * Description
   * @method sha
   * @param {} data
   * @return CallExpression
   */
  sha: function (data) {
    var shasum = crypto.createHash('sha1')
    shasum.update(data)
    return shasum.digest('hex')
  },

  /**
   * Description
   * @method format
   * @param {} template
   * @param {} col
   * @return CallExpression
   */
  format: function (template, col) {
    col =
      typeof col === 'object' ? col : Array.prototype.slice.call(arguments, 2)

    return template.replace(/\{\{|\}\}|\{(\w+)\}/g, function (m, n) {
      if (m == '{{') {
        return '{'
      }
      if (m == '}}') {
        return '}'
      }
      return col[n]
    })
  },

  isBinaryFile: function (fs, file, callback) {
    fs.exists(file, function (exists) {
      if (!exists) return callback(null, false)

      fs.open(file, 'r', function (err, descriptor) {
        if (err) return callback(err)
        var bytes = new Buffer(max_bytes)
        // Read the file with no encoding for raw buffer access.
        fs.read(
          descriptor,
          bytes,
          0,
          bytes.length,
          0,
          function (err, size, bytes) {
            fs.close(descriptor, function (err2) {
              if (err || err2) return callback(err || err2)
              return callback(null, isBinaryCheck(bytes, size))
            })
          }
        )
      })
    })
  },

  isBinaryCheck: isBinaryCheck,
  sortTasks(tasks) {
    return sort(tasks).asc([u => u.order, u => u.text])
  },
  hasBlankLines(content) {
    return new RegExp(`^\\s*${String(eol.auto)}`, 'gm').test(content)
  },
}
