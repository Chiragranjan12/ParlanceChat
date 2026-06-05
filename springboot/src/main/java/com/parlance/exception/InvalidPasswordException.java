package com.parlance.exception;

public class InvalidPasswordException extends RuntimeException {
    public InvalidPasswordException() {
        super("Invalid password");
    }

    public InvalidPasswordException(String identifier) {
        super("Invalid password for user: " + identifier);
    }
}
