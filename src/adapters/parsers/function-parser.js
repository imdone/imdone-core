export function getFunctionSignature(fn) {
  if (typeof fn !== "function") {
    throw new TypeError("Expected a function");
  }

  const fnString = fn.toString().trim();
  let name = fn.name || "anonymous";
  let params = "";

  // Match function parameters
  const paramMatch = fnString.match(/\(([^)]*)\)/);
  if (paramMatch) {
    params = paramMatch[1].trim();
  } else {
    // Handle arrow functions without parentheses
    const arrowMatch = fnString.match(/^(?:\S+\s+)?(\w+)?\s*=?\s*(?:async\s*)?\(?([^)=]*)\)?\s*=>/);
    if (arrowMatch) {
      name = name || arrowMatch[1] || "anonymous";
      params = arrowMatch[2].trim();
    }
  }

  return `${name}(${params})`;
}

