module.exports = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "warnOnUnsupportedTypeScriptVersion": false
  },
  "extends": ["react-app", "plugin:prettier/recommended"],
  "plugins": [
    "@typescript-eslint",
    "import",
    "jsx-a11y",
    "prettier",
    "react",
    "react-hooks"
  ],
  "ignorePatterns": [".eslintrc.js", "src/database/migrations/*.ts"],
  "rules": {
    "no-use-before-define": "off",
    "prettier/prettier": "error",
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "@mui/material",
            "importNames": ["makeStyles", "createMuiTheme"],
            "message": "Please import from @mui/material/styles instead. See https://material-ui.com/guides/minimizing-bundle-size/#option-2 for more information"
          }
        ]
      }
    ],
    "no-redeclare": "off",
    "import/no-anonymous-default-export": "off",
    "@typescript-eslint/no-redeclare": "error",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn", // or "error"
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }
    ]
  }
}
