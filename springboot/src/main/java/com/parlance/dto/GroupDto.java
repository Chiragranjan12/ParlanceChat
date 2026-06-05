package com.parlance.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public class GroupDto {
    @Data
    public static class CreateRequest {
        @NotBlank(message = "Group name is required")
        @Size(max = 255, message = "Group name must not exceed 255 characters")
        private String name;

        @Size(max = 1000, message = "Group description must not exceed 1000 characters")
        private String description = "";

        @NotEmpty(message = "At least one member must be selected")
        @Size(max = 100, message = "Group can have up to 100 selected members")
        private List<String> memberIds = List.of();
    }
}
