module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "no-console":0,
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
		"prefer-const": ["error", {
	        "destructuring": "any",
	        "ignoreReadBeforeAssign": false
	    }],
        "no-unused-vars": ["warn"]
    }
};
