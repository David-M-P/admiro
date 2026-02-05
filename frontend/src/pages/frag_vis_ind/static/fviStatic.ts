
export interface DataPoint {
    Chromosome: string;                 // e.g. "X"
    Start: number;                      // e.g. 155041000
    End: number;                        // e.g. 155063000
    Length: number;                     // e.g. 22000
    Haplotype: number;                  // e.g. 1
    "Mean Post. Prob.": number;         // e.g. 0.57099
    "Called Seq.": number;              // e.g. 20077
    "Mutation Rate": number;            // e.g. 0.74
    SNPs: number;                       // e.g. 5
    "Admixt. Pop. Variants": number;    // e.g. 0
    "Link. DAVC": number;               // e.g. 0

    Vindija: number;                    // e.g. 0
    Chagyrskaya: number;                // e.g. 0
    Altai: number;                      // e.g. 0
    Denisova: number;                   // e.g. 0

    "Private Vindija": number;          // e.g. 0
    "Private Chagyrskaya": number;      // e.g. 0
    "Private Altai": number;            // e.g. 0
    "Private Denisova": number;         // e.g. 0

    "Shared Neanderthal": number;       // e.g. 0
    "Shared Archaic": number;           // e.g. 0

    Ancestry: string;                   // e.g. "nonDAVC"
    "Min. Distance Ancestry": string;   // e.g. "Outgroup"
    "Min. Distance Value": number;      // e.g. 0.00072324

    "Ancestry Z test": string;          // e.g. "AMH"
    "Distance Z test": string;          // e.g. "7.2324e-04,2.5478e-03,2.1702e-03"
    "P-val Z test": string;             // e.g. "5.00e-01,2.93e-05,3.65e-04"

    Individual: string;                 // e.g. "AB02"
    "Phase State": string;              // e.g. "phased"
    Individual_Phase: string;           // e.g. "AB02_phased"
    Sex: string;                        // e.g. "F"
    Population: string;                 // e.g. "AytaMagbukon"
    Region: string;                     // e.g. "EAS"
    Dataset: string;                    // e.g. "AYTA"
}
