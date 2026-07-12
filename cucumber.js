module.exports = {
  default: {
    require: [
      'features/step_definitions/**/*.js',
      'support/**/*.js'
    ],
    format: [
      'progress-bar',
      'html:reports/cucumber_report.html',
      'json:reports/cucumber_report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true
    }
  }
};
