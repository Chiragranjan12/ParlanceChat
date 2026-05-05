package com.parlance;

import com.parlance.service.SeedService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ParlanceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ParlanceApplication.class, args);
    }

    @Bean
    public CommandLineRunner init(SeedService seedService) {
        return args -> seedService.seed();
    }
}
