import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiHideProperty,
  ApiOkResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 7961, description: "Nombre total d'éléments correspondant au filtre." })
  total!: number;

  @ApiProperty({ example: 319 })
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class PaginatedDto<T> {
  /**
   * Masqué du schéma de base : le générique `T` est effacé à la compilation, et
   * le plugin Swagger en déduirait que `data` est un tableau de `PaginatedDto`
   * — une dépendance circulaire qui fait échouer la construction du document.
   * Le vrai type est injecté par `ApiPaginatedResponse`, qui connaît le modèle.
   */
  @ApiHideProperty()
  data!: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** Assemble une réponse paginée à partir d'un total et d'une page de résultats. */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedDto<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Décrit une réponse paginée dans OpenAPI. Les génériques TypeScript disparaissent
 * à la compilation : sans ce décorateur, Swagger documenterait `data` comme un
 * tableau de type inconnu.
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  description?: string,
) =>
  applyDecorators(
    ApiExtraModels(PaginatedDto, PaginationMetaDto, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedDto) },
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(model) } },
            },
          },
        ],
      },
    }),
  );
