export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    //console.log('urlParams: ' + urlParams);
    return urlParams.get(param);
}

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


export function createSlug(str) {
    //console.log('str:', str);

    if (!str || typeof str !== 'string') {
        console.warn('Bad input to createSlug:', str);
    }
    
    // Convert to lower case
    str = str.toLowerCase();
    // Remove diacritics (accents)
    str = removeDiacritics(str);
    // Ensure all word delimiters are hyphens
    str = str.replace(/[\s—–_]/g, "-");
    // Strip out invalid characters
    str = str.replace(/[^a-z0-9\-]/g, "");
    // Replace multiple hyphens (-) with a single hyphen
    str = str.replace(/-{2,}/g, "-");
    // Trim hyphens (-) from ends
    return str.replace(/^-+|-+$/g, "");
}

function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Example usage:
//console.log(createSlug("Hello Wórld! This --is a test_")); // Output: "hello-world-this-is-a-test"