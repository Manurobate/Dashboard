package fr.robate.dashboard.controllers;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    // Inject the version from application.properties
    @Value("${app.version}")
    private String appVersion;

    @GetMapping("/")
    public String index(Model model) {

        model.addAttribute("appVersion", appVersion);

        return "index";
    }
}
