package com.parlance.exception;

public class DuplicateUserException extends RuntimeException {
    private final String field;
    private final String value;

    public DuplicateUserException(String field, String value) {
        super(field + " already in use: " + value);
        this.field = field;
        this.value = value;
    }

    public String getField() {
        return field;
    }

    public String getValue() {
        return value;
    }
}
