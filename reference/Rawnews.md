function getFireStore() {
  var email = PropertiesService.getScriptProperties().getProperty('EMAIL');
  var key = PropertiesService.getScriptProperties().getProperty('KEY').replace(/\\n/g, '\n');
  var projectId = PropertiesService.getScriptProperties().getProperty('PROJECT_ID');

  const firestore = FirestoreApp.getFirestore(email, key, projectId);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  sheet.clear();  // Clear the existing contents of the sheet

  const data = firestore.getDocuments("raw_news");

  data.sort((a, b) => {
    const dateA = new Date(a.fields['datetime'].stringValue);
    const dateB = new Date(b.fields['datetime'].stringValue);
    return dateB - dateA;  // For ascending order; use dateB - dateA for descending
  });

  if (data.length > 0) {
    var headers = Object.keys(data[0].fields);  // Assuming the first document has all keys you need
    headers.sort();  // Sort headers alphabetically
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // Populate data in the sheet
  data.forEach((doc, index) => {
    var row = headers.map(header => {
        if (doc.fields[header]) {
          return formatFirestoreValue(doc.fields[header]);
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
    return fieldValue.arrayValue.values.map(item => item.stringValue).join(", ");
  }
  // Handle other generic data types
  else {
    return fieldValue.toString();
  }
}