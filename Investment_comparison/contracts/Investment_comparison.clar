;; Clarinet Brand Investment Comparison
;; This smart contract allows tracking and comparing investment values of different clarinet brands over time

;; Data structures and constants
(define-data-var clarinet-brands (list 100 {brand: (string-ascii 50), initial-value: uint, current-value: uint, purchase-year: uint}) (list))
(define-data-var contract-owner principal tx-sender)
(define-data-var current-year uint u2023) ;; Added current year tracking instead of using block-height

;; Error codes
(define-constant ERR-BRAND-EXISTS u1)
(define-constant ERR-BRAND-NOT-FOUND u2)
(define-constant ERR-UNAUTHORIZED u3)
(define-constant ERR-DIVIDE-BY-ZERO u4)

;; Admin function to update the current year
(define-public (set-current-year (year uint))
    (begin
        ;; Check authorization
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-UNAUTHORIZED))
        (var-set current-year year)
        (ok true)
    )
)

;; Get the current year
(define-read-only (get-current-year)
    (var-get current-year)
)

;; Get all brand information - no dependencies
(define-read-only (get-all-brands)
    (var-get clarinet-brands)
)

;; Check if a brand name already exists - iterative approach
(define-read-only (brand-exists (brand-name (string-ascii 50)))
    (fold check-brand-fold (var-get clarinet-brands) {exists: false, name: brand-name})
)

;; Helper for brand-exists
(define-private (check-brand-fold 
    (entry {brand: (string-ascii 50), initial-value: uint, current-value: uint, purchase-year: uint})
    (acc {exists: bool, name: (string-ascii 50)}))
    (if (or (get exists acc) (is-eq (get brand entry) (get name acc)))
        {exists: true, name: (get name acc)}
        acc
    )
)

;; Add a new clarinet brand
(define-public (add-brand 
    (brand-name (string-ascii 50)) 
    (initial-value uint) 
    (current-value uint) 
    (purchase-year uint))
    (begin
        ;; Check authorization
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-UNAUTHORIZED))
        
        ;; Check if brand exists
        (asserts! (not (get exists (brand-exists brand-name))) (err ERR-BRAND-EXISTS))
        
        ;; Create the new entry and add to the list using manual insertion
        (let ((new-entry {
                brand: brand-name, 
                initial-value: initial-value, 
                current-value: current-value, 
                purchase-year: purchase-year
            }))
            
            ;; Add the brand using as-max-len?
            (let ((new-brands 
                    (match (as-max-len? (concat (var-get clarinet-brands) (list new-entry)) u100)
                        result result
                        (var-get clarinet-brands) ;; Fallback if we exceed max length
                    )))
                (var-set clarinet-brands new-brands)
                (ok true)
            )
        )
    )
)

;; Get a specific brand's information
(define-read-only (get-brand (brand-name (string-ascii 50)))
    (let ((result (fold find-brand-fold 
                  (var-get clarinet-brands) 
                  {found: false, entry: {
                      brand: "", 
                      initial-value: u0, 
                      current-value: u0, 
                      purchase-year: u0
                  }, name: brand-name})))
        (if (get found result)
            (ok (get entry result))
            (err ERR-BRAND-NOT-FOUND)
        )
    )
)

;; Helper for get-brand
(define-private (find-brand-fold 
    (entry {brand: (string-ascii 50), initial-value: uint, current-value: uint, purchase-year: uint})
    (acc {found: bool, entry: {brand: (string-ascii 50), initial-value: uint, current-value: uint, purchase-year: uint}, name: (string-ascii 50)}))
    (if (or (get found acc) (not (is-eq (get brand entry) (get name acc))))
        acc
        {found: true, entry: entry, name: (get name acc)}
    )
)

;; Update the current value of a brand
(define-public (update-value (brand-name (string-ascii 50)) (new-value uint))
    (begin
        ;; Check authorization
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-UNAUTHORIZED))
        
        ;; Check brand exists
        (asserts! (get exists (brand-exists brand-name)) (err ERR-BRAND-NOT-FOUND))
        
        ;; Find and update the brand using fold with corrected types
        (let ((result (fold update-brand-fold 
                     (var-get clarinet-brands) 
                     {updated: (list), name: brand-name, value: new-value})))
            ;; No need for additional match since fold result should already have correct type
            (var-set clarinet-brands (get updated result))
            (ok true)
        )
    )
)

;; Helper for update-value
(define-private (update-brand-fold 
    (entry {brand: (string-ascii 50), initial-value: uint, current-value: uint, purchase-year: uint})
    (acc {updated: (list 100 {brand: (string-ascii 50), initial-value: uint, current-value: uint, purchase-year: uint}), 
          name: (string-ascii 50), 
          value: uint}))
    (let ((updated-entry (if (is-eq (get brand entry) (get name acc))
                            (merge entry {current-value: (get value acc)})
                            entry)))
        ;; Handle the list concatenation carefully to maintain the correct type
        (let ((new-list 
                (match (as-max-len? (concat (get updated acc) (list updated-entry)) u100)
                    result result
                    (get updated acc) ;; Fallback if exceeding the limit
                )))
            {updated: new-list, 
             name: (get name acc), 
             value: (get value acc)}
        )
    )
)

;; Calculate ROI for a given brand
(define-read-only (calculate-roi (brand-name (string-ascii 50)))
    (let ((brand-result (get-brand brand-name)))
        (match brand-result 
            ok-brand (let ((initial (get initial-value ok-brand))
                           (current (get current-value ok-brand)))
                        (if (is-eq initial u0)
                            (ok u0)  ;; Avoid division by zero
                            (ok (/ (* (- current initial) u100) initial))
                        ))
            err-val (err err-val)
        )
    )
)

;; Calculate annual appreciation rate using current-year instead of block-height
(define-read-only (calculate-annual-appreciation (brand-name (string-ascii 50)))
    (let ((brand-result (get-brand brand-name)))
        (match brand-result 
            ok-brand (let ((initial (get initial-value ok-brand))
                           (current (get current-value ok-brand))
                           (purchase (get purchase-year ok-brand))
                           (years-owned (- (var-get current-year) purchase)))
                        (if (is-eq years-owned u0)
                            (err ERR-DIVIDE-BY-ZERO)
                            (if (is-eq initial u0)
                                (ok u0)  ;; Avoid another division by zero case
                                (ok (/ (/ (* (- current initial) u100) initial) years-owned))
                            )
                        ))
            err-val (err err-val)
        )
    )
)

;; Find the brand with the best ROI
(define-read-only (find-best-investment)
    (let ((brands (var-get clarinet-brands)))
        (if (is-eq (len brands) u0)
            {best-brand: none, best-roi: u0}
            (find-best-from-list brands)
        )
    )
)

;; Helper for find-best-investment
(define-private (find-best-from-list (brands (list 100 {brand: (string-ascii 50), initial-value: uint, current-value: uint, purchase-year: uint})))
    (fold calculate-and-compare-roi 
          brands 
          {best-brand: none, best-roi: u0})
)

;; Helper for find-best-from-list
(define-private (calculate-and-compare-roi 
    (entry {brand: (string-ascii 50), initial-value: uint, current-value: uint, purchase-year: uint})
    (acc {best-brand: (optional (string-ascii 50)), best-roi: uint}))
    (let ((initial (get initial-value entry))
          (current (get current-value entry))
          (roi (if (is-eq initial u0) 
                  u0  ;; Avoid division by zero
                  (/ (* (- current initial) u100) initial))))
        (if (> roi (get best-roi acc))
            {best-brand: (some (get brand entry)), best-roi: roi}
            acc
        )
    )
)

;; Initialize database with sample clarinets
(begin
    ;; Set initial current year to 2023 for examples
    (var-set current-year u2023)
    
    ;; Premium Brands
    (unwrap-panic (add-brand "Buffet R13" u350000 u410000 u2018))
    (unwrap-panic (add-brand "Selmer Recital" u420000 u450000 u2019))
    (unwrap-panic (add-brand "Yamaha CSVR" u380000 u430000 u2020))
    
    ;; Mid-Range Brands
    (unwrap-panic (add-brand "Buffet E11" u180000 u200000 u2021))
    (unwrap-panic (add-brand "Yamaha YCL-450" u160000 u190000 u2022))
    
    ;; Student Brands
    (unwrap-panic (add-brand "Jupiter JCL700N" u80000 u70000 u2019))
    (unwrap-panic (add-brand "Bundy BCL-300" u60000 u50000 u2020))
)