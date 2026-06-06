package com.parlance.exception;

public class DuplicateMemberException extends RuntimeException {
    private final String groupId;
    private final String userId;

    public DuplicateMemberException(String groupId, String userId) {
        super("User " + userId + " is already a member of group " + groupId);
        this.groupId = groupId;
        this.userId = userId;
    }

    public String getGroupId() {
        return groupId;
    }

    public String getUserId() {
        return userId;
    }
}
