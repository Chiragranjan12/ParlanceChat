package com.parlance.exception;

public class ChannelNotFoundException extends RuntimeException {
    private final String channelId;

    public ChannelNotFoundException(String channelId) {
        super("Channel not found: " + channelId);
        this.channelId = channelId;
    }

    public String getChannelId() {
        return channelId;
    }
}
