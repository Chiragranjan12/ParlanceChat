package com.parlance.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class GroupDto {
    @Data
    public static class CreateRequest {
        @NotBlank private String name;
        private String description = "";
        private List<String> memberIds = List.of();
    }
}
