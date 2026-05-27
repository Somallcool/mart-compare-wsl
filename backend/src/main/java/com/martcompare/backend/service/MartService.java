package com.martcompare.backend.service;

import com.martcompare.backend.entity.CatalogProduct;
import com.martcompare.backend.entity.Mart;
import com.martcompare.backend.entity.Product;
import com.martcompare.backend.repository.CatalogProductRepository;
import com.martcompare.backend.repository.MartRepository;
import com.martcompare.backend.repository.ProductRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MartService {

    private final MartRepository martRepository;
    private final CatalogProductRepository catalogProductRepository;
    private final ProductRepository productRepository;

    public List<Mart> getNearbyCUs(double lat, double lng, double radius) {
        return martRepository.findNearbyCUs(lat, lng, radius);
    }

    @Transactional
    public Mart findOrCreate(String name, String address, double lat, double lng) {
        List<Mart> nearby = martRepository.findNearby(lat, lng, 0.1);
        if (!nearby.isEmpty()) {
            return nearby.get(0);
        }

        Mart mart = new Mart();
        mart.setName(name);
        mart.setAddress(address);
        mart.setLatitude(lat);
        mart.setLongitude(lng);
        mart = martRepository.save(mart);

        List<CatalogProduct> catalog = catalogProductRepository.findAll();
        for (CatalogProduct cp : catalog) {
            Product product = new Product();
            product.setMartId(mart.getId());
            product.setName(cp.getName());
            product.setPrice(cp.getPrice());
            product.setEventType(cp.getEventType());
            product.setImageUrl(cp.getImageUrl());
            product.setStock(3 + (int) (Math.random() * 48));
            productRepository.save(product);
        }

        return mart;
    }
}
