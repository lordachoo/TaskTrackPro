// This is a utility class to handle custom field data in a consistent way

// Process customData before submitting to the server
export function processCustomData(customData: Record<string, any> | null | undefined): Record<string, any> {
  // If customData is null or undefined, return an empty object
  if (customData === null || customData === undefined) {
    console.log('CustomDataHandler: customData is null or undefined, returning empty object');
    return {};
  }
  
  // Make a copy of the customData to avoid reference issues
  const dataObj = { ...customData };
  
  // Filter out any properties with null, undefined, or empty string values
  const filteredObj = Object.entries(dataObj)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {} as Record<string, any>);
  
  console.log('CustomDataHandler: Processed customData', {
    original: customData,
    filtered: filteredObj
  });
  
  return filteredObj;
}

// Remove a key from customData and return a new object
export function removeCustomDataField(customData: Record<string, any> | null | undefined, fieldKey: string): Record<string, any> {
  // If customData is null or undefined, return an empty object
  if (customData === null || customData === undefined) {
    return {};
  }
  
  // Create a copy of customData
  const newData = { ...customData };
  
  // Delete the field
  delete newData[fieldKey];
  
  console.log(`CustomDataHandler: Removed field ${fieldKey}`, {
    before: customData,
    after: newData
  });
  
  return newData;
}