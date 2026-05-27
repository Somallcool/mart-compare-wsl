package com.martcompare.backend.controller;

import com.martcompare.backend.entity.Product;
import com.martcompare.backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService productService;

    @GetMapping
    public List<Product> getProducts(@RequestParam(required = false) Long martId) {
        if (martId != null) {
            return productService.getProductsByMartId(martId);
        }
        return productService.getAllProducts();
    }
}
