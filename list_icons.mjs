import * as icons from "@phosphor-icons/react";
const iconNames = Object.keys(icons).filter(k => k.endsWith("Icon"));
console.log(iconNames.length)
console.log(iconNames.slice(0, 5))
