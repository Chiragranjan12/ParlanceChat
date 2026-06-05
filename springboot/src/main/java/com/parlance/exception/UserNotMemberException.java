package com.parlance.exception;

public class UserNotMemberException extends RuntimeException {
    private final String userId;
    private final String roomId;

    public UserNotMemberException(String userId, String roomId) {
        super("User " + userId + " is not a member of " + roomId);
        this.userId = userId;
        this.roomId = roomId;
    }

    public UserNotMemberException(String userId, String roomId, String roomType) {
        super("User " + userId + " is not a member of " + roomType + " " + roomId);
        this.userId = userId;
        this.roomId = roomId;
    }

    public String getUserId() {
        return userId;
    }

    public String getRoomId() {
        return roomId;
    }
}
