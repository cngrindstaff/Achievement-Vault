function trimBeforeParenthesis(str) {
    const index = str.indexOf('('); // Find the first index of '('
    if (index === -1) {
        return str; // Return the original string if '(' is not found
    }
    return str.substring(0, index).trim(); // Trim and return everything before '('
}
function removeTrailingSpace (str){
    if(str.endsWith(" ")){
        //console.log('trimming end space')
        str = str.trimEnd();
    }
    return str;
}

//log all attributes of an element.
function logAllAttributes(thisElement){
    const attributes = {};
    $.each(thisElement[0].attributes, function() {
        attributes[this.name] = this.value;
    });
    console.log('attributes: ');
    console.log(attributes);
}


export function createSlug(value) {
    // Convert to lower case
    value = value.toLowerCase();
    // Remove diacritics (accents)
    value = removeDiacritics(value);
    // Ensure all word delimiters are hyphens
    value = value.replace(/[\s—–_]/g, "-");
    // Strip out invalid characters
    value = value.replace(/[^a-z0-9\-]/g, "");
    // Replace multiple hyphens (-) with a single hyphen
    value = value.replace(/-{2,}/g, "-");
    // Trim hyphens (-) from ends
    return value.replace(/^-+|-+$/g, "");
}

function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Example usage:
console.log(createSlug("Hello Wórld! This --is a test_")); // Output: "hello-world-this-is-a-test"