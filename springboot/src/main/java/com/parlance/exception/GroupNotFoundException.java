package com.parlance.exception;

public class GroupNotFoundException extends RuntimeException {
    private final String groupId;

    public GroupNotFoundException(String groupId) {
        super("Group not found: " + groupId);
        this.groupId = groupId;
    }

    public String getGroupId() {
        return groupId;
    }
}
