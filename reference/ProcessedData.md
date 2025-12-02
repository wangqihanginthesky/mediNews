function getFireStore() {
  var email = PropertiesService.getScriptProperties().getProperty('EMAIL');
  var key = PropertiesService.getScriptProperties().getProperty('KEY').replace(/\\n/g, '\n');
  var projectId = PropertiesService.getScriptProperties().getProperty('PROJECT_ID');

  const firestore = FirestoreApp.getFirestore(email, key, projectId);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  sheet.clear();  // Clear the existing contents of the sheet

  const data = firestore.getDocuments("medical_data");

  // Collect all unique keys from all documents
  var allKeys = new Set();
  data.forEach(doc => {
    Object.keys(doc.fields).forEach(key => allKeys.add(key));
  });
  var headers = Array.from(allKeys).sort();  // Convert Set to Array and sort alphabetically

  // Sort data by datetime field
  data.sort((a, b) => {
    const dateA = new Date(a.fields['datetime'] ? a.fields['datetime'].stringValue : 0);
    const dateB = new Date(b.fields['datetime'] ? b.fields['datetime'].stringValue : 0);
    return dateB - dateA;  // For descending order
  });

  // Set headers
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // Populate data in the sheet
  data.forEach((doc, index) => {
    var row = headers.map(header => {
      if (doc.fields[header]) {
        var formattedValue = formatFirestoreValue(doc.fields[header]);
        return formattedValue == '[object Object]' ? '' : formattedValue 
      }
      return "";
    });
    sheet.getRange(index + 2, 1, 1, headers.length).setValues([row]);
  });
}

function formatFirestoreValue(fieldValue) {
  // Check if the field is a string value
  if (fieldValue.stringValue !== undefined) {
    return fieldValue.stringValue;
  }
  // Check if the field is a boolean value
  else if (fieldValue.booleanValue !== undefined) {
    return fieldValue.booleanValue ? 'True' : 'False';
  }
  // Check if the field is an array value
  else if (fieldValue.arrayValue !== undefined && fieldValue.arrayValue.values) {
    return fieldValue.arrayValue.values.map(item => item.stringValue || JSON.stringify(item)).join(", ");
  }
  // Handle other generic data types
  else {
    return fieldValue.toString();
  }
}
