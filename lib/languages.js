'use strict';

var cBlock = {"start":"/*", "end":"*/", "ignore":"*"};
var htmlBlock = {"start": "<!--", "end": "-->", "ignore": "-"};
var gamsBlock = {"start": "$ontext", "end": "$offtext", "ignore": "-"};
module.exports = {
  ".boot":         {"name": "boot", "symbol": ";"},
  ".coffee":      {"name": "coffeescript", "symbol": "#"},
  ".litcoffee":   {"name": "coffeescript", "symbol": "#", "literate": true},
  "Cakefile":     {"name": "coffeescript", "symbol": "#"},
  ".rb":          {"name": "ruby", "symbol": "#"},
  ".py":          {"name": "python", "symbol": "#"},
  ".jl":          {"name": "julia", "symbol": "#", "block": {"start": "#=", "end": "=#", "ignore": "#"}},
  ".tex":         {"name": "tex", "symbol": "%"},
  ".latex":       {"name": "tex", "symbol": "%"},
  ".swift":       {"name": "swift", "symbol": "//", "block": cBlock},
  ".js":          {"name": "javascript", "symbol": "//", "block": cBlock},
  ".es6":         {"name": "javascript", "symbol": "//", "block": cBlock},
  ".es":          {"name": "javascript", "symbol": "//", "block": cBlock},
  ".ex":          {"name": "elixir", "symbol": "#"},
  ".exs":         {"name": "elixir", "symbol": "#"},
  ".jsx":         {"name": "jsx", "symbol": "//", "block": cBlock},
  ".java":        {"name": "java", "symbol": "//", "block": cBlock},
  ".properties":  {"name": "properties", "symbol": "#"},
  ".sbt":         {"name": "sbt", "symbol": "//", "block": cBlock},
  ".groovy":      {"name": "groovy", "symbol": "//", "block": cBlock},
  ".scss":        {"name": "scss", "symbol": "//"},
  ".css":         {"name": "css", "symbol": "//", "block": cBlock},
  ".cpp":         {"name": "cpp", "symbol": "//", "block": cBlock},
  ".cxx":         {"name": "cpp", "symbol": "//", "block": cBlock},
  ".cc":          {"name": "cpp", "symbol": "//", "block": cBlock},
  ".hpp":         {"name": "cpp", "symbol": "//", "block": cBlock},
  ".hxx":         {"name": "cpp", "symbol": "//", "block": cBlock},
  ".hh":          {"name": "cpp", "symbol": "//", "block": cBlock},
  ".ino":         {"name": "cpp", "symbol": "//", "block": cBlock},
  ".php":         {"name": "php", "symbol": "//", "block": htmlBlock},
  ".idr":         {"name": "idris", "symbol": "--"},
  ".hs":          {"name": "haskell", "symbol": "--"},
  // DOING Add support for literate haskell
  // [imdone dashboard is empty in Haskell project · Issue #34 · imdone/imdone-core](https://github.com/imdone/imdone-core/issues/34)
  // <!--
  // #imdone-1.54.6
  // #bug
  // created:2025-03-01T12:08:18-05:00
  // -->
  // [Bug Description]
  // ## :ballot_box_with_check: Tasks
  // - [ ] Add tasks here
  // ## :white_check_mark: DoD
  // - [ ] Reproduce the bug
  // - [ ] Write a failing test that demonstrates the bug
  // - [ ] Fix the bug
  // - [ ] Ensure all tests pass
  // - [ ] Review the code changes
  // - [ ] Update documentation if necessary
  // <!--
  // order:-10
  // -->
  ".lhs":          {"name": "haskell", "symbol": "--"},
  ".elm":         {"name": "elm", "symbol": "--"},
  ".erl":         {"name": "erlang", "symbol": "%"},
  ".hrl":         {"name": "erlang", "symbol": "%"},
  ".less":        {"name": "less", "symbol": "//", "block": cBlock},
  ".c":           {"name": "c", "symbol":"//", "block": cBlock},
  ".h":           {"name": "objectivec", "symbol": "//", "block": cBlock},
  ".m":           {"name": "objectivec", "symbol": "//", "block": cBlock},
  ".mm":          {"name": "objectivec", "symbol": "//", "block": cBlock},
  ".m4":          {"name": "m4", "symbol": "#"},
  ".scala":       {"name": "scala", "symbol": "//", "block": cBlock},
  ".cs":          {"name": "cs", "symbol": "//", "block": cBlock},
  ".as":          {"name": "actionscript", "symbol": "//"},
  ".scpt":        {"name": "applescript", "symbol": "--"},
  ".applescript": {"name": "applescript", "symbol": "--"},
  ".sh":          {"name": "bash", "symbol": "#"},
  ".clj":         {"name": "clojure", "symbol": ";"},
  ".cljc":        {"name": "clojure", "symbol": ";"},
  ".cljs":        {"name": "clojurescript", "symbol": ";"},
  ".cmake":       {"name": "cmake", "symbol": "#"},
  ".d":           {"name": "d", "symbol": "//"},
  ".p":           {"name": "delphi", "symbol": "//"},
  ".pp":          {"name": "delphi", "symbol": "//"},
  ".pas":         {"name": "delphi", "symbol": "//"},
  ".bat":         {"name": "dos", "symbol": "@?rem"},
  ".btm":         {"name": "dos", "symbol": "@?rem"},
  ".cmd":         {"name": "dos", "symbol": "@?rem"},
  ".gms":         {"name": "gams", "symbol": "*", "block": gamsBlock},
  ".go":          {"name": "go", "symbol": "//", "block": cBlock},
  ".ini":         {"name": "ini", "symbol": ";"},
  ".lisp":        {"name": "lisp", "symbol": ";"},
  ".mel":         {"name": "mel", "symbol": "//"},
  ".pl":          {"name": "perl", "symbol": "#"},
  ".pm":          {"name": "perl", "symbol": "#"},
  ".pod":         {"name": "perl", "symbol": "#"},
  ".t":           {"name": "perl", "symbol": "#"},
  ".pl6":         {"name": "perl6", "symbol": "#"},
  ".pm6":         {"name": "perl6", "symbol": "#"},
  ".r":           {"name": "r", "symbol": "#"},
  ".rc":          {"name": "rust", "symbol": "//"},
  ".rs":          {"name": "rust", "symbol": "//"},
  ".sql":         {"name": "sql", "symbol": "--"},
  ".pks":         {"name": "pks", "symbol": "--", "block": cBlock},
  ".pkb":         {"name": "pkb", "symbol": "--", "block": cBlock},
  ".vala":        {"name": "vala", "symbol": "//"},
  ".vapi":        {"name": "vala", "symbol": "//"},
  ".vbe":         {"name": "vbscript", "symbol": "'"},
  ".vbs":         {"name": "vbscript", "symbol": "'"},
  ".wsc":         {"name": "vbscript", "symbol": "'"},
  ".wsf":         {"name": "vbscript", "symbol": "'"},
  ".vhdl":        {"name": "vhdl", "symbol": "--"},
  ".bas":         {"name": "basic", "symbol": "REM"},
  ".ps1":         {"name": "powershell", "symbol": "#", "block": {"start":"<#", "end":"#>", "ignore":"#"} },
  ".lua":         {"name": "lua", "symbol": "--", "block": {"start": "--[[", "end":"--]]"} },
  ".hx":          {"name": "haxe", "symbol": "//", "block": cBlock},
  ".eg":          {"name": "earl-grey", "symbol": ";;"},
  ".jade":        {"name": "jade", "symbol": "//-"},
  ".pug":         {"name": "jade", "symbol": "//-"},
  ".styl":        {"name": "stylus", "symbol": "//"},
  ".ts":          {"name": "typescript", "symbol": "//", "block": cBlock},
  ".html":        {"name": "html", "symbol": "//", "block": htmlBlock },
  ".haml":        {"name": "haml", "symbol": "-#"},
  ".yaml":        {"name": "yaml", "symbol": "#"},
  ".yml":         {"name": "yaml", "symbol": "#"},
  ".cls":         {"name": "apex class", "symbol": "//", "block": cBlock},
  ".trigger":     {"name": "apex trigger", "symbol": "//", "block": cBlock},
  ".page":        {"name": "visualforce page", "symbol": "//", "block": htmlBlock },
  ".component":   {"name": "visualforce component", "symbol": "//", "block": htmlBlock },
  ".cmp":         {"name": "lightning component", "symbol": "//", "block": htmlBlock },
  ".vm":          {"name": "velocity", "symbol": "##", "block": {"start": "#**", "end": "*#", "ignore": "*"} },
  ".vue":         {"name": "vue component", "symbol": "//-", "block": cBlock},
  ".lock":        {"name": "yarn lock", "symbol": "#"},
  ".re":          {"name": "reasonml", "block": cBlock},
  ".kt":          {"name": "kotlin", "symbol": "//", "block": cBlock},
  ".dart":        {"name": "dart", "symbol": "//", "block": cBlock},
};
