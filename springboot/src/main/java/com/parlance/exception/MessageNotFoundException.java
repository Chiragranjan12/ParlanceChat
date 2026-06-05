package com.parlance.exception;

public class MessageNotFoundException extends RuntimeException {
    private final String messageId;

    public MessageNotFoundException(String messageId) {
        super("Message not found: " + messageId);
        this.messageId = messageId;
    }

    public String getMessageId() {
        return messageId;
    }
}
