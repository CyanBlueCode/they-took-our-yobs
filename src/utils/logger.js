const fs = require('fs');
const path = require('path');

module.exports = {
  logSuccess: (jobButton) => {
    // append JobId + timestamp to success log
  },
  logFailure: (jobButton, error) => {
    // append JobId + timestamp + error message
  },
  logCustomQuestion: (label, jobButton) => {
    // append JobId + URL + label to custom questions log
  }
};
