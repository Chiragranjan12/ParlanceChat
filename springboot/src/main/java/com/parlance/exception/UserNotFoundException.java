package com.parlance.exception;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String identifier) {
        super("User not found: " + identifier);
    }

    public UserNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
