package com.martcompare.backend.controller;

import com.martcompare.backend.entity.Mart;
import com.martcompare.backend.service.MartService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marts")
public class MartController {

    private final MartService martService;

    @GetMapping("/nearby")
    public List<Mart> getNearbyCUs(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "1") double radius) {
        return martService.getNearbyCUs(lat, lng, radius);
    }

    @PostMapping
    public Mart findOrCreate(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String address = (String) body.get("address");
        double lat = ((Number) body.get("latitude")).doubleValue();
        double lng = ((Number) body.get("longitude")).doubleValue();
        return martService.findOrCreate(name, address, lat, lng);
    }
}
