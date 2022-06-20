module.exports = existValidation = (IsValid, errorStatus, errorCode) => {
    if (!IsValid) {
        const error = new Error(errorStatus);
        error.statusCode = errorCode;
        throw error;
    }
};

// existValidation(imageUrl, 'No file picked.', 422);
