module.exports = {
       "extends": "./node_modules/eslint-config-google/index.js",
       "parserOptions": {
           "ecmaVersion": 6,
           "sourceType": "script",
         },
       "rules": {
            "indent": ['error', 'tab'],
            "curly": 'error',
            "no-tabs": 'off',
            'max-len': ['off'],
       }
   };