package com.martcompare.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "catalog_product")
public class CatalogProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private Integer price;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "image_url")
    private String imageUrl;
}
