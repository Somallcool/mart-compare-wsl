package com.martcompare.backend.repository;

import com.martcompare.backend.entity.CatalogProduct;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CatalogProductRepository extends JpaRepository<CatalogProduct, Long> {
}
