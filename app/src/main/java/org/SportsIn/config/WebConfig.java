package org.SportsIn.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Rediriger toutes les routes non-API vers index.html pour le routage React
        // Utilisation de noms de variables différents pour éviter l'erreur "capture twice"
        registry.addViewController("/{path:[\\w-]+}")
                .setViewName("forward:/index.html");
        registry.addViewController("/{path1:[\\w-]+}/{path2:[\\w-]+}")
                .setViewName("forward:/index.html");
        registry.addViewController("/{path1:[\\w-]+}/{path2:[\\w-]+}/{path3:[\\w-]+}")
                .setViewName("forward:/index.html");
    }
}

